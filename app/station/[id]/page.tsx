import StationDetails from "../../../station-details"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StationDetailsPage({ params }: PageProps) {
  const { id } = await params

  return <StationDetails stationId={id} />
}
