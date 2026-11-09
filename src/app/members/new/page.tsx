import { redirect } from 'next/navigation'

export default function RegisterMemberPage() {
  redirect('/members?action=new')
}
