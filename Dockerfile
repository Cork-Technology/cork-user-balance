FROM node:24.3.0-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.7.1

WORKDIR /envio-indexer

COPY ./package.json ./package.json
COPY ./pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm install --frozen-lockfile

COPY ./config.yaml ./config.yaml
COPY ./schema.graphql ./schema.graphql
COPY ./abis ./abis

RUN pnpm envio codegen


COPY ./src ./src
COPY ./tsconfig.json ./tsconfig.json
CMD pnpm envio start

