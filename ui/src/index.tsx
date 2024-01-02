import React, { useState, useEffect } from 'react'

const styles: any = {
    tableWrapper: {
        width: '100%',
        maxHeight: '750px',
        overflowY: 'auto',
        position: 'relative'
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
    tableHeaderRow: {
        position: 'sticky',
        top: 0,
        backgroundColor: '#f5f5f5',
        zIndex: 1,
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
    return images
        .map(image => {
            const parts = image.split(':')
            return parts.length > 1 ? parts[1].slice(0, 14) : 'latest'
        })
        .join(', ')
}

const getCellStyle = (version, projectImages) => {
    if (version === 'N/A') {
        return styles.tableCell
    }
    const isLatest = isLatestVersion(version, Object.values(projectImages))
    const backgroundColor = isLatest ? '#07bc0c' : '#f1c40f'

    return {
        ...styles.tableCell,
        backgroundColor: backgroundColor,
        color: backgroundColor === '#07bc0c' ? 'white' : 'black'
    }
}

const formatProjectName = name => {
    return name
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

const ApplicationTable = () => {
    const [applications, setApplications] = useState({})
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [sortedGenericNames, setSortedGenericNames] = useState([])

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
                const sortedGenericNames = Object.keys(groupedApps).sort((a, b) =>
                    a.localeCompare(b)
                )
                setSortedGenericNames(sortedGenericNames)
                setApplications(applications)
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
                style={{ ...styles.tableRow, ...styles.tableHeaderRow }}
            >
                <div style={styles.tableCell}>Application Name</div>
                {projects.map(project => (
                    <div style={styles.tableCell} key={project}>
                        {formatProjectName(project)}
                    </div>
                ))}
            </div>
            <div className='argo-table-body'>
                {sortedGenericNames.map((genericName, index) => {
                    const projectImages = applications[genericName]
                    ;<div
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
                })}
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
