import NewLoanApplicationPage from '@/components/loans/loan-application-form'
import { LoanApplicationDialog } from '@/components/loans/loan-application-dialog'

export default function Page() {
  return (
    <LoanApplicationDialog>
      <NewLoanApplicationPage modal />
    </LoanApplicationDialog>
  )
}
