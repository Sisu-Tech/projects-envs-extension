import React, { useState, useEffect } from 'react'

export const ApplicationTable = () => {
    const [applications, setApplications] = useState({})

    useEffect(() => {
        const url =
            '/api/v1/applications?fields=items.metadata.name%2Citems.metadata.labels%2Citems.spec.project%2Citems.operation.sync%2Citems.status.sync.status%2Citems.status.health%2Citems.status.summary%2Citems.spec'
        // Fetch applications
        fetch(url)
            .then(response => response.json())
            .then(data => {
              const filteredApps = data.items.filter(app => {
                  const labels = app.metadata.labels
                  return (
                      labels &&
                      labels.genericApplicationName &&
                      labels.applicationType === 'services' &&
                      labels.environment !== 'dev'
                  )
              })
                // Group applications by genericApplicationName and project
                const groupedApps = filteredApps.items.reduce((acc, app) => {
                    const genericName = app.metadata.labels?.genericApplicationName || 'N/A'
                    const project = app.spec.project
                    if (!acc[genericName]) {
                        acc[genericName] = {}
                    }
                    acc[genericName][project] = app.spec.source?.image || 'N/A'
                    return acc
                }, {})
                setApplications(groupedApps)
            })
    }, [])

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

export const component = ApplicationTable
;((window: any) => {
    window?.extensionsAPI?.registerSystemLevelExtension(
        component,
        'Sisu Tech Project Env',
        '/sisu-tech-projects',
        'fa-sharp fa-light fa-bars-progress fa-lg'
    )
})(window)
