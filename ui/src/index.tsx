import React, { useState, useEffect } from 'react'

const styles: any = {
    tableWrapper: {
        width: '100%',
        margin: '0 auto',
        borderCollapse: 'collapse',
        padding: '10px',
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

const compareVersions = (v1, v2) => {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = i < parts1.length ? parts1[i] : 0
        const num2 = i < parts2.length ? parts2[i] : 0

        if (num1 > num2) return 1
        if (num2 > num1) return -1
    }

    return 0
}

const isLatestVersion = (currentVersion, allVersions) => {
    return allVersions.every(otherVersion => compareVersions(currentVersion, otherVersion) >= 0)
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
            return parts.length > 1 ? parts[1].slice(0, 14) : 'latest' // Default to 'latest' if no tag is specified
        })
        .join(', ')
}

const getCellStyle = (version, projectImages) => {
    if (version === 'N/A') {
        return styles.tableCell // Return default style for 'N/A'
    }
    const isLatest = isLatestVersion(version, Object.values(projectImages))
    return {
        ...styles.tableCell,
        backgroundColor: isLatest ? 'green' : 'yellow'
    }
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
                            return (
                                <div style={getCellStyle(version, projectImages)} key={project}>
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
