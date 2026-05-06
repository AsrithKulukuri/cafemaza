import { ReserveTableClient } from "@/components/reserve-table/ReserveTableClient";

const tables = Array.from({ length: 12 }).map((_, idx) => ({
    id: idx + 1,
    seats: idx % 3 === 0 ? 6 : 4,
}));

export default function ReserveTablePage() {
    return <ReserveTableClient tables={tables} />;
}
