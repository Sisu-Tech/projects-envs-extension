import React, { useState, useEffect } from 'react'

const styles: any = {
    tableWrapper: {
        width: '100%',
        margin: '0 auto',
        borderCollapse: 'collapse'
    },
    tableRow: {
        display: 'flex',
        width: '100%'
    },
    tableCell: {
        flex: 1,
        padding: '8px',
        border: '1px solid #ddd',
        textAlign: 'left'
    },
    tableHeader: {
        backgroundColor: '#f5f5f5',
        borderBottom: '2px solid #ccc'
    },
    tableBodyRowEven: {
        backgroundColor: '#f9f9f9'
    }
}

const isLatestVersion = (currentVersion, allVersions) => {
    // Simple version comparison logic (may need to adjust based on your versioning format)
    const maxVersion = Math.max(...allVersions.map(v => parseFloat(v.replace(/[^0-9.]/g, ''))))
    const current = parseFloat(currentVersion.replace(/[^0-9.]/g, ''))
    return current >= maxVersion
}

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

const parseImageTag = images => {
    // Assuming images is an array of strings like 'registry/repository:tag'
    return images
        .map(image => {
            const parts = image.split(':')
            return parts.length > 1 ? parts[1] : 'latest' // Default to 'latest' if no tag is specified
        })
        .join(', ')
}

const ApplicationTable = () => {
    const [applications, setApplications] = useState({})
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetchApplications().then(data => {
            if (data) {
                const projectSet = new Set()
                const groupedApps = data.items.reduce((acc, app) => {
                    const labels = app.metadata.labels
                    if (
                        labels &&
                        labels.genericApplicationName &&
                        labels.applicationType === 'services' &&
                        labels.environment !== 'dev'
                    ) {
                        const genericName = labels.genericApplicationName
                        const project = app.spec.project
                        projectSet.add(project)

                        if (!acc[genericName]) {
                            acc[genericName] = {}
                        }
                        acc[genericName][project] = parseImageTag(app.status.summary.images)
                    }
                    return acc
                }, {})
                setApplications(groupedApps)
                setProjects(Array.from(projectSet))
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
        <div style={styles.tableWrapper}>
            <div
                className='argo-table-header'
                style={{ ...styles.tableRow, ...styles.tableHeader }}
            >
                <div style={styles.tableCell}>Generic Application Name</div>
                {projects.map(project => (
                    <div style={styles.tableCell} key={project}>
                        {project}
                    </div>
                ))}
            </div>
            <div className='argo-table-body'>
                {Object.entries(applications).map(([genericName, projectImages], index) => (
                    <div
                        style={{
                            ...styles.tableRow,
                            ...(index % 2 === 0 ? styles.tableBodyRowEven : {})
                        }}
                        key={genericName}
                    >
                        <div style={styles.tableCell}>{genericName}</div>
                        {projects.map(project => {
                            const version = projectImages[project] || 'N/A'
                            const isLatest = isLatestVersion(version, Object.values(projectImages))
                            return (
                                <div
                                    style={{
                                        ...styles.tableCell,
                                        backgroundColor: isLatest ? '#18be94' : '#f5c43e'
                                    }}
                                    key={project}
                                >
                                    {version}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
        </div>
    )
}

;((window: any) => {
    if (window && window.extensionsAPI) {
        window.extensionsAPI.registerSystemLevelExtension(
            ApplicationTable,
            'Applications Table',
            '/application-table',
            'fa-table'
        )
    } else {
        console.error('Argo CD extensions API is not available')
    }
})(window)
