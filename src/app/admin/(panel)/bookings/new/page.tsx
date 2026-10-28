import { listServices, requireSettings } from '@/server/settings';
import NewBookingForm from './NewBookingForm';

export const metadata = { title: 'Add a booking' };

export default function NewBookingPage() {
  const s = requireSettings();
  const services = listServices({ includeInactive: true }).map((svc) => ({ id: svc.id, name: svc.name }));
  return (
    <>
      <header className="admin-head">
        <h1>Add a booking</h1>
        <p>For bookings taken by phone or in person. It is confirmed straight away and the customer gets an email.</p>
      </header>
      <NewBookingForm services={services} timezone={s.timezone} />
    </>
  );
}
