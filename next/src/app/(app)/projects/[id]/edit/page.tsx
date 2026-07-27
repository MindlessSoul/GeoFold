'use client'

import { useParams } from 'next/navigation'
import { ProjectForm } from '@/components/ProjectForm'

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  return <ProjectForm projectId={id} />
}
