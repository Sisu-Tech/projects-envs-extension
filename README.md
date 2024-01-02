Rollout Extension
-----------------

The project introduces the Projects as environments dashboard into the Argo CD Web UI.

# Quick Start

- Install Argo CD and Argo CD Extensions Controller: https://github.com/argoproj-labs/argocd-extensions
- Create `argo-rollouts` extension in `argocd` namespace

```
kubectl apply -n argocd \
    -f https://github.com/Sisu-Tech/projects-envs-extension/blob/main/manifests/install.yaml
```
