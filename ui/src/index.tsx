import React, { useState, useEffect } from 'react'

const fetchApplications = async () => {
    try {
        const response = await fetch(
            '/api/v1/applications?fields=items.metadata.name%2Citems.metadata.labels%2Citems.spec.project%2Citems.operation.sync%2Citems.status.sync.status%2Citems.status.health%2Citems.status.summary%2Citems.spec'
        )
        if (!response.ok) {
            throw new Error('Network response was not ok')
        }
        return await response.json()
    } catch (error) {
        console.error('Fetch error:', error)
        return null
    }
}

const ApplicationTable = () => {
    const [applications, setApplications] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchApplications().then(data => {
            if (data) {
                const filteredApps = data.items.filter(app => {
                    const labels = app.metadata.labels
                    return (
                        labels &&
                        labels.genericApplicationName &&
                        labels.applicationType === 'services' &&
                        labels.environment !== 'dev'
                    )
                })
                const groupedApps = filteredApps.reduce((acc, app) => {
                    const genericName = app.metadata.labels.genericApplicationName || 'N/A'
                    const project = app.spec.project
                    acc[genericName] = {
                        ...(acc[genericName] || {}),
                        [project]: app.spec.source?.image || 'N/A'
                    }
                    return acc
                }, {})
                setApplications(groupedApps)
            } else {
                setError('Failed to load applications')
            }
            setLoading(false)
        })
    }, [])

    if (loading) {
        return <div>Loading...</div>
    }

    if (error) {
        return <div>Error: {error}</div>
    }

    return (
        <div title='Application Table'>
            <table>
                <thead>
                    <tr>
                        <th>Generic Application Name</th>
                        {Object.keys(applications).map(project => (
                            <th key={project}>{project}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(applications).map(([genericName, projectImages]) => (
                        <tr key={genericName}>
                            <td>{genericName}</td>
                            {Object.values(projectImages).map((image, index) => (
                                <td key={index}>{image}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

((window: any) => {
    if (window && window.extensionsAPI) {
        window.extensionsAPI.registerSystemLevelExtension(
            ApplicationTable,
            'ApplicationTable',
            '/application-table',
            'fa-table'
        )
    } else {
        console.error('Argo CD extensions API is not available')
    }
})(window)
