import { JournalCalendarView } from "@/components/features/journal/journal-calendar-view";

export const metadata = {
  title: "Reflective Daily Journal | Healer",
  description: "A private calendar space for self-reflection with instant sentiment recognition & reflective summarization.",
};

export default function JournalPage() {
  return <JournalCalendarView />;
}
