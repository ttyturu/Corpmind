import os
from langchain_community.document_loaders import PyPDFLoader, TextLoader, Docx2txtLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_pinecone import PineconeVectorStore
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from pinecone import Pinecone, ServerlessSpec

PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "corpmind")
EMBEDDING_DIMENSION = 1536

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))

if PINECONE_INDEX_NAME not in [idx["name"] for idx in pc.list_indexes()]:
    pc.create_index(
        name=PINECONE_INDEX_NAME,
        dimension=EMBEDDING_DIMENSION,
        metric="cosine",
        spec=ServerlessSpec(cloud="aws", region="us-east-1"),
    )

pinecone_index = pc.Index(PINECONE_INDEX_NAME)
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = PineconeVectorStore(index=pinecone_index, embedding=embeddings)

PROMPT_TEMPLATE = """You are a helpful HR assistant for this company.
Answer the employee's question using ONLY the information provided in the context below.
If the answer is not in the context, say "I don't have information about that in our HR documents."
Do not make up or infer information beyond what is provided.
If the question contains multiple distinct parts, answer each part separately. For each part,
put a short **bold label** on its own line, then write the answer as a new paragraph directly
below that label (not on the same line).

Context:
{context}

Question: {question}

Answer:"""


def load_document(file_path: str, filename: str):
    ext = filename.lower().split(".")[-1]
    if ext == "pdf":
        loader = PyPDFLoader(file_path)
    elif ext == "txt":
        loader = TextLoader(file_path)
    elif ext in ["docx", "doc"]:
        loader = Docx2txtLoader(file_path)
    else:
        raise ValueError(f"Unsupported file type: .{ext}")
    return loader.load()


def ingest_document(file_path: str, filename: str) -> dict:
    docs = load_document(file_path, filename)

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        separators=["\n\n", "\n", ". ", " ", ""]
    )
    chunks = splitter.split_documents(docs)

    for chunk in chunks:
        chunk.metadata["source_file"] = filename

    vectorstore.add_documents(chunks)

    return {"chunks_added": len(chunks), "filename": filename}


def query_documents(question: str) -> dict:
    retriever = vectorstore.as_retriever(search_kwargs={"k": 8})

    prompt = PromptTemplate(
        template=PROMPT_TEMPLATE,
        input_variables=["context", "question"]
    )

    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0)

    qa_chain = RetrievalQA.from_chain_type(
        llm=llm,
        chain_type="stuff",
        retriever=retriever,
        chain_type_kwargs={"prompt": prompt},
        return_source_documents=True
    )

    result = qa_chain.invoke({"query": question})

    sources = list(set([
        doc.metadata.get("source_file", "Unknown")
        for doc in result["source_documents"]
    ]))

    return {
        "answer": result["result"],
        "sources": sources
    }


def _fetch_all_metadatas() -> dict:
    ids = [vec_id for batch in pinecone_index.list() for vec_id in batch]
    metadatas = {}
    for i in range(0, len(ids), 100):
        batch_ids = ids[i:i + 100]
        fetched = pinecone_index.fetch(ids=batch_ids)
        for vec_id, vec in fetched.vectors.items():
            metadatas[vec_id] = vec.metadata
    return metadatas


def list_documents() -> list:
    metadatas = _fetch_all_metadatas()
    files = list(set([
        m.get("source_file", "Unknown")
        for m in metadatas.values()
        if m.get("source_file")
    ]))
    return files


def delete_document(filename: str) -> dict:
    metadatas = _fetch_all_metadatas()
    ids_to_delete = [
        vec_id for vec_id, m in metadatas.items()
        if m.get("source_file") == filename
    ]

    if not ids_to_delete:
        raise ValueError(f"No chunks found for file: {filename}")

    pinecone_index.delete(ids=ids_to_delete)
    return {"deleted_chunks": len(ids_to_delete), "filename": filename}
