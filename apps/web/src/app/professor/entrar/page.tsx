import { redirect } from 'next/navigation';

export default function ProfessorEntrarPage() {
  redirect('/login?role=organizer');
}
