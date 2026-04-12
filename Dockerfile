FROM denoland/deno:debian-2.7.12

WORKDIR /site

COPY src src

COPY build.ts build.ts

COPY deno.json deno.json

COPY deno.lock deno.lock

RUN apt update

RUN apt install npm --yes

RUN npm install -g less

EXPOSE 8080

CMD ["deno", "task", "start"]