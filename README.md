Rollout Extension
-----------------

The project introduces the Projects as environments dashboard into the Argo CD Web UI.

# Quick Start

- Install Argo CD and Argo CD Extensions Controller: https://github.com/argoproj-labs/argocd-extensions
- Create `argo-rollouts` extension in `argocd` namespace

```
kubectl apply -n argocd \
    -f https://raw.githubusercontent.com/argoproj-labs/rollout-extension/v0.2.1/manifests/install.yaml
```
