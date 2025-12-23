from backend.rag import query_documents
from backend.agent import generate_response


def main():
    question = input("Enter your question about Strength & Conditioning Gym: ")
    relevant_chunks = query_documents(question)
    answer = generate_response(question, relevant_chunks)
    print("Answer:\n", answer)


if __name__ == "__main__":
    main() 