FROM debian:bookworm-slim

RUN apt-get update && apt-get -y install curl zstd
RUN curl -fsSL https://ollama.com/install.sh | sh

ENTRYPOINT [ "bash", "entrypoint.sh" ]
