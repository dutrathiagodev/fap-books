# Guia de NestJS

Documentação oficial: https://docs.nestjs.com

> **O NestJS NÃO está no projeto agora.** Por decisão do time, o FAP Books começa só com Next.js e Supabase (veja [architecture/README.md](../architecture/README.md)). Este guia existe para **estudo** e para quando o time decidir usar. **Não instale nem crie um projeto Nest sem perguntar antes ao responsável.**

## O que é

NestJS é um framework para criar **APIs** (o "backend") em Node.js com TypeScript, de forma **organizada**.

> Analogia: se o Next.js é o balcão e o Supabase é o arquivo, o NestJS seria uma **sala de atendimento no meio**: ela recebe o pedido, confere as regras do regulamento e só então mexe no arquivo.

**Quando faria sentido** no FAP Books: se as regras do negócio (limite de livros, multa, aprovação de reservas) crescessem a ponto de não caberem bem nos *services* do Next.js, ou se o sistema precisasse de tarefas agendadas e integrações (como o envio de WhatsApp e e-mail).

## A ideia central: três peças

| Peça | Papel | Analogia |
| -- | -- | -- |
| **Controller** | Recebe o pedido da internet e devolve a resposta | O atendente do balcão |
| **Service** | Tem a lógica e as regras | O regulamento aplicado |
| **Module** | Junta controllers e services de um assunto | A seção da biblioteca (ex.: "livros") |

## 1. Controller

```ts
// src/books/books.controller.ts
import { Controller, Get, Param } from "@nestjs/common";
import { BooksService } from "./books.service";

@Controller("books")
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  findAll() {
    return this.booksService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.booksService.findOne(id);
  }
}
```

- `@Controller("books")` define o endereço: `/books`.
- `@Get()` responde ao pedido `GET /books`; `@Get(":id")` responde a `GET /books/123`.
- `@Param("id")` pega o valor do `:id`.
- O `constructor(private readonly booksService...)` pede ao Nest o service pronto. Isso se chama **injeção de dependência**: você não cria o service, o Nest entrega.
- Os símbolos com `@` são **decorators**: etiquetas que dizem ao Nest o que cada coisa faz.

## 2. Service

```ts
// src/books/books.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";

interface Book {
  id: string;
  title: string;
}

@Injectable()
export class BooksService {
  private readonly books: Book[] = [{ id: "1", title: "Dom Casmurro" }];

  findAll(): Book[] {
    return this.books;
  }

  findOne(id: string): Book {
    const book = this.books.find((item) => item.id === id);
    if (!book) throw new NotFoundException("Livro não encontrado");
    return book;
  }
}
```

- `@Injectable()` permite que o Nest entregue esta classe aonde pedirem.
- `NotFoundException` vira uma resposta HTTP 404 sozinha.
- Aqui os dados estão numa lista de exemplo. No projeto real viriam do banco.

## 3. Module

```ts
// src/books/books.module.ts
import { Module } from "@nestjs/common";
import { BooksController } from "./books.controller";
import { BooksService } from "./books.service";

@Module({
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
```

O módulo é a "lista de quem faz parte". Sem registrá-lo no módulo principal (`AppModule`), o Nest não o enxerga.

## 4. Validar o que chega (DTO)

Nunca confie no que vem da internet. Descreva e valide:

```ts
// src/books/create-book.dto.ts
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}
```

Usa-se no controller com `@Post()` e `@Body()`, e liga-se a validação global com `ValidationPipe` no `main.ts`. Pedido fora do formato volta com erro 400.

## 5. O que muda se o Nest entrar no FAP Books

| Hoje (Next.js + Supabase) | Com NestJS |
| -- | -- |
| A página chama um **service** do Next.js | A página chama a **API** do Nest |
| O RLS é a principal barreira de segurança | O Nest confere o perfil, e o RLS continua como segunda barreira |
| Regras em `src/domain` | Regras no Nest |
| Um projeto | **Dois projetos** (e talvez dois repositórios) |

Mais coisas para aprender, subir e manter. Por isso a decisão é do time.

## Dicas de quem trabalha com Nest

1. **Um módulo por assunto** (livros, empréstimos, usuários).
2. **Controller fino, service com a lógica.** Controller que decide regra é sinal de bagunça.
3. **Valide toda entrada** (DTO). E toda rota declara **quem pode** chamá-la.
4. **Erros viram respostas certas** (`NotFoundException`, `BadRequestException`), nunca uma tela de erro bruta.
5. **Teste o service**, que é onde estão as regras.
6. **Aprenda o Nest só depois de dominar o básico de Node e TypeScript.** Os decorators parecem mágica no começo.

## Para estudar

- Início rápido: https://docs.nestjs.com/first-steps
- Controllers: https://docs.nestjs.com/controllers
- Providers (services): https://docs.nestjs.com/providers
- Módulos: https://docs.nestjs.com/modules
