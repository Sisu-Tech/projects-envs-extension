import { CSSProperties } from "react";

export type HelmParameter = {
  name: string;
  value: string;
};

export type ApplicationResponse = {
  items: Array<{
    metadata: {
      labels: {
        applicationType?: string;
        environment?: string;
        genericApplicationName?: string;
      };
      name: string;
    };
    spec: {
      source?: {
        repoURL: string;
        path: string;
        targetRevision: string;
        helm?: {
          parameters: HelmParameter[];
          values: string;
        };
      };
      destination?: {
        namespace: string;
        name: string;
      };
      project: string;
    };
    status: {
      health?: {
        status: string;
        lastTransitionTime: string;
      };
      summary: {
        images?: string[];
      };
      sync?: {
        status: string;
      };
    };
  }>;
  metadata: {
    resourceVersion: string;
  };
};

// Additional types for application data
export type ApplicationData = {
  name: string;
  imageTag: string;
};

export type GroupedApplications = {
  [genericName: string]: {
    [project: string]: ApplicationData;
  };
};

export type VersionDiff = {
  major: number;
  minor: number;
  patch: number;
};

export type Styles = {
  container: CSSProperties;
  title: CSSProperties;
  tableWrapper: CSSProperties;
  tableRow: CSSProperties;
  tableCell: CSSProperties;
  tableHeaderRow: CSSProperties;
  tableBodyRowEven: CSSProperties;
  emptyCell: CSSProperties;
  toggleButton: CSSProperties;
};
