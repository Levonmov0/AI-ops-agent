from .config import settings


def generate_response(question: str, relevant_chunks: list[str]) -> str:
    context = "\n\n".join(relevant_chunks).strip()

    if not context:
        return "I don't have enough information in my documents to answer that."

    prompt = (
        "You are an assistant that answers questions about Strength & Conditioning Gym.\n"
        "Use only the provided context. If the answer is not in the context, say you don't have the information.\n"
        "Be concise and to the point.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {question}\n"
        "Answer:"
    )

    response = settings.client.chat.completions.create(
        model=settings.chat_model,
        messages=[
            {"role": "system", "content": "You are a helpful assistant."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content.strip()