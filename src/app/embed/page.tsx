import BookingWizard from '@/components/booking/BookingWizard';

export const metadata = {
  title: 'Book a Session',
};

export default function EmbedPage() {
  return (
    <main className="embed-mode">
      <BookingWizard />
    </main>
  );
}
