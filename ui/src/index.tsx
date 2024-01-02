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

const parseImageTag = (images) => {
    // Assuming images is an array of strings like 'registry/repository:tag'
    return images.map(image => {
        const parts = image.split(':');
        return parts.length > 1 ? parts[1] : 'latest'; // Default to 'latest' if no tag is specified
    }).join(', ');
};

const ApplicationTable = () => {
    const [applications, setApplications] = useState({});
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchApplications().then(data => {
            if (data) {
                const projectSet = new Set();
                const groupedApps = data.items.reduce((acc, app) => {
                    const labels = app.metadata.labels;
                    if (labels && labels.genericApplicationName && labels.applicationType === 'services' && labels.environment !== 'dev') {
                        const genericName = labels.genericApplicationName;
                        const project = app.spec.project;
                        projectSet.add(project);

                        if (!acc[genericName]) {
                            acc[genericName] = {};
                        }
                        acc[genericName][project] = parseImageTag(app.status.summary.images);
                    }
                    return acc;
                }, {});
                setApplications(groupedApps);
                setProjects(Array.from(projectSet));
            } else {
                setError('Failed to load applications');
            }
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div title='Application Table'>
            <table>
                <thead>
                    <tr>
                        <th>Generic Application Name</th>
                        {projects.map(project => <th key={project}>{project}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(applications).map(([genericName, projectImages]) => (
                        <tr key={genericName}>
                            <td>{genericName}</td>
                            {projects.map(project => <td key={project}>{projectImages[project] || 'N/A'}</td>)}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


;((window: any) => {
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
