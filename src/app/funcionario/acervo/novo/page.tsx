import { BookCreateForm } from "@/components";
import { RolePage } from "@/components/RolePage";
import { createBookAction } from "./actions";

export default function NovoLivroPage() {
  return <RolePage role="librarian">{() => <BookCreateForm onCreate={createBookAction} />}</RolePage>;
}
