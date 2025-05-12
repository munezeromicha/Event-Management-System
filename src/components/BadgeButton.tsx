'use client'

import { useState } from 'react'
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'

interface BadgeButtonProps {
  registrationId: string
  status: string
  apiBaseUrl?: string
}

interface BadgeResponse {
  downloadUrl?: string
  message?: string
  badgeUrl?: string
}

export default function BadgeButton({ 
  registrationId, 
  status, 
  apiBaseUrl = 'http://localhost:4000'
}: BadgeButtonProps): JSX.Element | null {
  const [loading, setLoading] = useState<boolean>(false)

  // Button should be disabled or not shown if status is not approved
  if (status.toLowerCase() !== 'approved') {
    return null
  }

  const generateAndDownloadBadge = async (): Promise<void> => {
    try {
      setLoading(true)
      const toastId = toast.loading('Preparing your badge...')
      
      // Get auth token
      const authToken = Cookies.get('authToken')
      
      if (!authToken) {
        toast.error('Authentication token not found')
        toast.dismiss(toastId)
        setLoading(false)
        return
      }

      console.log('Generating badge...')
      
      // First, try to generate the badge
      const generateResponse = await fetch(
        `${apiBaseUrl}/api/badges/registrations/${registrationId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      )
      
      console.log('Generate response status:', generateResponse.status)
      
      if (!generateResponse.ok) {
        const contentType = generateResponse.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const errorData = await generateResponse.json() as BadgeResponse
          console.error('Error response:', errorData)
          toast.error(errorData.message || 'Failed to generate badge')
        } else {
          const errorText = await generateResponse.text()
          console.error('Non-JSON error response:', errorText)
          toast.error('Failed to generate badge')
        }
        toast.dismiss(toastId)
        setLoading(false)
        return
      }

      const data = await generateResponse.json() as BadgeResponse
      console.log('Badge generation successful:', data)

      // Use the downloadUrl from the response if available
      const downloadUrl = `${apiBaseUrl}/api/badges/registrations/${registrationId}?download=true`
      console.log('Download URL:', downloadUrl)

      // Trigger download with proper headers
      try {
        const downloadResponse = await fetch(downloadUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Accept': 'application/pdf',
          },
          credentials: 'include'
        })

        if (!downloadResponse.ok) {
          throw new Error(`Download failed: ${downloadResponse.status}`)
        }

        const blob = await downloadResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `badge-${registrationId}.pdf`
        document.body.appendChild(link)
        link.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(link)
        
        toast.dismiss(toastId)
        toast.success('Badge download started')
      } catch (error) {
        console.error('Download error:', error)
        toast.error('Failed to download badge')
      }

      setLoading(false)
    } catch (error) {
      console.error('Badge download error:', error)
      toast.error('Failed to download badge. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={generateAndDownloadBadge}
      disabled={loading}
      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      type="button"
    >
      {loading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </>
      ) : (
        <>
          <DocumentArrowDownIcon className="h-4 w-4 mr-1.5" />
          Download Badge
        </>
      )}
    </button>
  )
} 