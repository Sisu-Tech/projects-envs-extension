import React, { useEffect, useState, CSSProperties } from 'react';
import type { ApplicationData, ApplicationResponse, NamespacedApplications, Styles, VersionDiff } from './types';

// Function to detect dark mode based on Argo CD's approach
const isDarkMode = (): boolean => {
    // Check if document exists (for SSR compatibility)
    if (typeof document !== 'undefined') {
        // Check for Argo CD's theme classes
        const appElement = document.getElementById('app');
        if (appElement) {
            // Check if any child has theme-dark class
            const hasDarkTheme = appElement.querySelector('.theme-dark') !== null;
            return hasDarkTheme;
        }

        // Fallback to other methods
        return (
            document.body.classList.contains('theme-dark') ||
            document.documentElement.getAttribute('data-theme') === 'dark' ||
            (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        );
    }
    return false;
};

const getStyles = (): Styles => {
    const darkMode = isDarkMode();

    return {
        container: {
            backgroundColor: darkMode ? '#1e1e1e' : '#ffffff',
            color: darkMode ? '#e1e1e1' : 'inherit',
        } as CSSProperties,
        title: {
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: darkMode ? '#e1e1e1' : '#333',
        } as CSSProperties,
        tableWrapper: {
            width: '100%',
            maxHeight: 'calc(100vh - 101.6px)',
            overflowY: 'auto',
            position: 'relative',
        } as CSSProperties,
        tableRow: {
            display: 'flex',
            width: '100%',
        } as CSSProperties,
        tableCell: {
            flex: 1,
            padding: '8px',
            border: darkMode ? '1px solid #444' : '1px solid #ddd',
            textAlign: 'left',
            color: darkMode ? '#e1e1e1' : 'inherit',
        } as CSSProperties,
        tableHeaderRow: {
            position: 'sticky',
            top: 0,
            backgroundColor: darkMode ? '#333' : '#f5f5f5',
            zIndex: 1,
            borderBottom: darkMode ? '2px solid #555' : '2px solid #ccc',
        } as CSSProperties,
        tableBodyRowEven: {
            backgroundColor: darkMode ? '#2a2a2a' : '#f9f9f9',
        } as CSSProperties,
        emptyCell: {
            flex: 1,
            padding: '8px',
            border: darkMode ? '1px solid #444' : '1px solid #ddd',
            textAlign: 'left',
            color: darkMode ? '#e1e1e1' : 'inherit',
            backgroundColor: darkMode ? '#1e1e1e' : '',
        } as CSSProperties,
        toggleButton: {
            padding: '8px 16px',
            backgroundColor: darkMode ? '#555' : '#eee',
            color: darkMode ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginBottom: '20px',
            fontSize: '14px',
        } as CSSProperties,
        dropdown: {
            padding: '8px',
            marginBottom: '20px',
            backgroundColor: darkMode ? '#333' : '#f5f5f5',
            color: darkMode ? '#e1e1e1' : '#333',
            border: darkMode ? '1px solid #555' : '1px solid #ccc',
            borderRadius: '4px',
            fontSize: '14px',
            width: '200px',
        } as CSSProperties,
        filterContainer: {
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
        } as CSSProperties,
    };
};

const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const num1 = i < parts1.length ? parts1[i] : 0;
        const num2 = i < parts2.length ? parts2[i] : 0;

        if (num1 > num2) return 1;
        if (num2 > num1) return -1;
    }

    return 0;
};

const fetchApplications = async (): Promise<ApplicationResponse | null> => {
    try {
        const fields = ['items.metadata.name', 'items.metadata.labels', 'items.spec', 'items.status.summary'];

        const params = {
            fields: fields.join(','),
            selector: 'applicationType=services',
        };

        const queryString = Object.entries(params)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const url = `/api/v1/applications?${queryString}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return (await response.json()) as ApplicationResponse;
    } catch (error) {
        console.error('Fetch error:', error);
        return null;
    }
};

const parseImageTag = (images?: string[]): string => {
    return images
        ? images
              .map((image) => {
                  if (!image || image.includes('telepresence')) {
                      return '';
                  }
                  const parts = image.split(':');
                  return parts.length > 1 ? parts[1].slice(0, 14) : 'latest';
              })
              .filter(Boolean)
              .join(', ')
        : '';
};

const getVersionRank = (currentVersion: string, allVersions: string[]): number => {
    const sortedVersions = [...allVersions].sort((a, b) => compareVersions(b, a));
    return sortedVersions.indexOf(currentVersion);
};

const getVersionDiff = (v1: string, v2: string): VersionDiff => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    return {
        major: parts1[0] - parts2[0],
        minor: parts1[1] - parts2[1],
        patch: parts1[2] - parts2[2],
    };
};

const getCellStyle = (version?: string, projectImages?: { [project: string]: ApplicationData }): CSSProperties => {
    const darkMode = isDarkMode();
    let backgroundColor = '#07bc0c';
    let color = 'white';

    if (!version) {
        backgroundColor = darkMode ? '#1e1e1e' : '';
        color = darkMode ? '#e1e1e1' : 'inherit';
    } else if (version.includes('-ST-')) {
        backgroundColor = 'purple';
        color = 'white';
    } else {
        const allVersions = Object.values(projectImages || {})
            .filter((p) => p.imageTag) // Filter out empty tags
            .map((p) => p.imageTag);

        if (allVersions.length === 0) {
            backgroundColor = darkMode ? '#1e1e1e' : '';
            color = darkMode ? '#e1e1e1' : 'inherit';
            return { ...getStyles().tableCell, backgroundColor, color, cursor: 'pointer' };
        }

        const latestVersion = allVersions.sort((a, b) => compareVersions(b, a))[0];
        const versionDiff = getVersionDiff(version, latestVersion);

        if (versionDiff.major < 0 || versionDiff.minor < 0 || versionDiff.patch < -20) {
            backgroundColor = darkMode ? '#a83232' : 'red';
        } else if (getVersionRank(version, allVersions) === 1) {
            backgroundColor = darkMode ? '#d4ac0d' : '#f1c40f';
            color = 'black';
        } else if (getVersionRank(version, allVersions) > 1) {
            backgroundColor = darkMode ? '#b35900' : '#e67e22';
        } else {
            backgroundColor = darkMode ? '#0a6e0a' : '#07bc0c';
        }
    }

    const styles = getStyles();

    return {
        ...styles.tableCell,
        backgroundColor,
        color,
        cursor: 'pointer',
    };
};

const formatProjectName = (name: string): string => {
    return name
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

const ApplicationTable = () => {
    const [applications, setApplications] = useState<NamespacedApplications>({});
    const [projects, setProjects] = useState<string[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [sortedGenericNames, setSortedGenericNames] = useState<string[]>([]);
    const [namespaces, setNamespaces] = useState<string[]>([]);
    const [selectedNamespace, setSelectedNamespace] = useState<string>('');

    const styles = getStyles();

    useEffect(() => {
        fetchApplications().then((data) => {
            if (data) {
                const projectSet = new Set<string>();
                const namespaceSet = new Set<string>();

                // Modified to store apps by namespace
                const groupedApps = data.items.reduce((acc: NamespacedApplications, app) => {
                    const labels = app.metadata.labels;
                    const genericName = labels.genericApplicationName;
                    const project = app.spec.project;
                    const namespace = app.spec.destination?.namespace || '';

                    projectSet.add(project);
                    if (namespace) {
                        namespaceSet.add(namespace);
                    }

                    if (!acc[genericName]) {
                        acc[genericName] = {};
                    }

                    if (!acc[genericName][project]) {
                        acc[genericName][project] = {};
                    }

                    // Store by namespace to prevent overwriting
                    acc[genericName][project][namespace] = {
                        name: app.metadata.name,
                        imageTag: parseImageTag(app.status.summary.images),
                        environment: labels.environment,
                        namespace: namespace,
                    };

                    return acc;
                }, {});

                const sortedGenericNames = Object.keys(groupedApps).sort((a, b) => a.localeCompare(b));
                const sortedProjects = Array.from(projectSet).sort();
                const sortedNamespaces = Array.from(namespaceSet).sort();

                setSortedGenericNames(sortedGenericNames);
                setApplications(groupedApps);
                setProjects(sortedProjects);
                setNamespaces(sortedNamespaces);

                // Set default namespace if available
                if (sortedNamespaces.length > 0) {
                    setSelectedNamespace(sortedNamespaces[0]);
                }
            } else {
                setError('Failed to load applications');
            }
            setLoading(false);
        });
    }, []);

    const handleNamespaceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedNamespace(event.target.value);
    };

    const getFilteredGenericNames = (): string[] => {
        if (!selectedNamespace) {
            return sortedGenericNames;
        }

        const filtered = sortedGenericNames.filter((genericName) => {
            const serviceApps = applications[genericName];
            if (!serviceApps) return false;

            // Check if any project has the selected namespace
            return Object.values(serviceApps).some((projectApps) =>
                Object.keys(projectApps).includes(selectedNamespace),
            );
        });

        return filtered;
    };

    const getFilteredServiceApplications = (genericName: string, project: string) => {
        const projectApps = applications[genericName]?.[project];
        if (!projectApps) return null;

        // If no namespace is selected, return the first app (any namespace)
        if (!selectedNamespace) {
            const firstNamespace = Object.keys(projectApps)[0];
            return projectApps[firstNamespace];
        }

        // Return the app for the selected namespace if it exists
        return projectApps[selectedNamespace] || null;
    };

    if (loading) {
        return <div style={{ color: isDarkMode() ? '#e1e1e1' : 'inherit' }}>Loading...</div>;
    }

    if (error) {
        return <div style={{ color: isDarkMode() ? '#e1e1e1' : 'inherit' }}>Error: {error}</div>;
    }

    const filteredGenericNames = getFilteredGenericNames();

    return (
        <div style={styles.container}>
            {namespaces.length > 1 && (
                <div style={styles.filterContainer}>
                    <label style={{ marginRight: '10px', color: isDarkMode() ? '#e1e1e1' : '#333' }}>
                        Filter by Namespace:
                    </label>
                    <select value={selectedNamespace} onChange={handleNamespaceChange} style={styles.dropdown}>
                        {namespaces.map((namespace) => (
                            <option key={namespace} value={namespace}>
                                {namespace}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div style={styles.tableWrapper}>
                <div className="argo-table-header" style={{ ...styles.tableRow, ...styles.tableHeaderRow }}>
                    <div style={styles.tableCell}>Application Name</div>
                    {projects.map((project: string) => (
                        <div style={styles.tableCell} key={project}>
                            {formatProjectName(project)}
                        </div>
                    ))}
                </div>
                <div className="argo-table-body">
                    {filteredGenericNames.map((genericName: string, index: number) => {
                        const mergedProjects: Record<string, any> = {};

                        Object.entries(applications[genericName]).forEach(([envKey, projects]) => {
                            Object.entries(projects).forEach(([projectKey, projectValue]) => {
                                mergedProjects[`${envKey}-${projectKey}`] = projectValue;
                            });
                        });
                        return (
                            <div
                                style={{
                                    ...styles.tableRow,
                                    ...(index % 2 === 0 ? styles.tableBodyRowEven : {}),
                                }}
                                key={genericName}
                            >
                                <div style={styles.tableCell}>{genericName}</div>
                                {projects.map((project: string) => {
                                    const projectService = getFilteredServiceApplications(genericName, project);
                                    if (!projectService) {
                                        return <div style={styles.emptyCell} key={project} />;
                                    }

                                    const version = projectService.imageTag;
                                    const isDev = projectService.environment === 'dev';
                                    const url = `https://argocd.sisutech.${isDev ? 'dev' : 'ee'}/applications/argocd/${
                                        projectService.name
                                    }`;

                                    return (
                                        <div
                                            style={getCellStyle(version, mergedProjects)}
                                            key={project}
                                            onClick={() => {
                                                window.open(url, '_blank');
                                            }}
                                        >
                                            {!version ? '' : version}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
((window: Window & typeof globalThis & { extensionsAPI?: any }) => {
    if (window && window.extensionsAPI) {
        window.extensionsAPI.registerSystemLevelExtension(
            ApplicationTable,
            'Applications Table',
            '/application-table',
            'fa-table',
        );
    } else {
        console.error('Argo CD extensions API is not available');
    }
})(window);
