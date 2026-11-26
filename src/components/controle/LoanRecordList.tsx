import type { LoanRecord } from "@/types/loan-record";
import { LoanRecordItem } from "./LoanRecordItem";

interface LoanRecordListProps {
  records: LoanRecord[];
  today: string;
  busyId: string | null;
  onReturn: (record: LoanRecord) => void;
  onDelete: (record: LoanRecord) => void;
}

// Lista de empréstimos: um item por registro, via map().
export function LoanRecordList({ records, today, busyId, onReturn, onDelete }: LoanRecordListProps) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Empréstimos cadastrados">
      {records.map((record) => (
        <LoanRecordItem key={record.id} record={record} today={today} busy={busyId === record.id} onReturn={onReturn} onDelete={onDelete} />
      ))}
    </ul>
  );
}
