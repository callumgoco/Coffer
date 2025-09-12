import Card from '../components/Card'
import PageHeader from '../components/PageHeader'

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" actions={<button className="btn btn-outline">Export CSV</button>} />
      <Card className="mt-4">
        <div className="text-subtler text-sm">Charts placeholder</div>
      </Card>
    </>
  )
}


