import React, { useEffect, useState } from 'react'

const styles: any = {
    tableWrapper: {
        width: '100%',
        maxHeight: 'calc(100vh - 101.6px)',
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
        const labels = [
            'environment!=dev',
            'applicationType=services',
        ];

        const fields = [
            'items.metadata.name',
            'items.metadata.labels',
            'items.spec.project',
            'items.operation.sync',
            'items.status.sync.status',
            'items.status.health',
            'items.status.summary',
            'items.spec'
        ];

        const params = {
            fields: fields.join(','),
            selector: labels.join(','),
        };

        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const url = `/api/v1/applications?${queryString}`;

        const response = await fetch(url);
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

const getCellStyle = (version?, projectImages?) => {
    let backgroundColor = '#07bc0c';
    let color = '#white';
    if (!version) {
        backgroundColor = '';
    } else {
        const isLatest = isLatestVersion(version, Object.values(projectImages).map((p: any) => p.imageTag));
        if (!isLatest) {
            backgroundColor = '#f1c40f';
            color = 'black';
        }
    }

    return {
        ...styles.tableCell,
        backgroundColor,
        color,
        cursor:'pointer'
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
                        labels.genericApplicationName
                    ) {
                        const genericName = labels.genericApplicationName
                        const project = app.spec.project
                        projectSet.add(project)

                        if (!acc[genericName]) {
                            acc[genericName] = {}
                        }
                        acc[genericName][project] = {
                            name: app.metadata.name,
                            imageTag: parseImageTag(app.status.summary.images),
                        };
                    }
                    return acc
                }, {})
                const sortedGenericNames = Object.keys(groupedApps).sort((a, b) =>
                    a.localeCompare(b)
                )
                setSortedGenericNames(sortedGenericNames)
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
                    const serviceApplications = applications[genericName]
                    return (
                        <div
                            style={{
                                ...styles.tableRow,
                                ...(index % 2 === 0 ? styles.tableBodyRowEven : {})
                            }}
                            key={genericName}
                        >
                            <div style={styles.tableCell}>{genericName}</div>
                            {projects.map(project => {
                                const projectService = serviceApplications?.[project];
                                if (!projectService) {
                                    return <div key={project} />
                                }

                                const version = projectService.imageTag;
                                const url = `https://argocd.sisutech.ee/applications/argocd/${projectService.name}`;
                                return (
                                    <div
                                        style={getCellStyle(version, serviceApplications)}
                                        key={project}
                                        onClick={() => {
                                            window.open(url, '_blank')
                                        }}
                                    >
                                        {!version ? '' : version}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

    ; ((window: any) => {
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
