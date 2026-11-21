// Runs the body with a secret text credential bound to `variable` when Jenkins has it, and without when it does not:
// optional integrations (Sentry source maps) must not break the build before they are set up.
def withOptionalSecret(String credentialsId, String variable, Closure body) {
    try {
        withCredentials([string(credentialsId: credentialsId, variable: variable)]) {
            body()
        }
    } catch (org.jenkinsci.plugins.credentialsbinding.impl.CredentialNotFoundException ignored) {
        echo "Credential ${credentialsId} not found; continuing without it."
        body()
    }
}

pipeline {
    agent any

    options {
        timestamps()
        disableConcurrentBuilds()
        skipDefaultCheckout(true)
    }

    environment {
        IMAGE_REGISTRY = 'ghcr.io'
        IMAGE_NAME = 'ghcr.io/rizkysiregar/narrativ-web-client'
        IMAGE_PLATFORM = 'linux/amd64'
        GITOPS_REPOSITORY = 'https://github.com/rizkysiregar/homelabs-gitops.git'
        GITOPS_BRANCH = 'main'
        GITOPS_MANIFEST = 'apps/narrativ-web-client-dev/kustomization.yaml'
        NODE_IMAGE = 'node:24-alpine'
        // Sentry (error reporting). The DSN is public and goes into the bundle; without it nothing is reported.
        // Source maps are uploaded when the secret text credential `sentry-auth-token` exists.
        SENTRY_DSN = 'https://0ad0c268a2bf89aad1a9ae1a8933414d@o4512470292955136.ingest.us.sentry.io/4512470363799552'
        SENTRY_ORG = 'rizkysiregar'
        SENTRY_PROJECT = 'narrativ-web-client'
        YQ_IMAGE = 'mikefarah/yq:4.45.4'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                // The workspace survives between builds, and checkout leaves untracked files alone: the gitops clone of
                // the last stage (gitops/) and old build output would otherwise be checked by prettier and eslint.
                sh 'git clean -ffdx'
                script {
                    env.IMAGE_TAG = sh(
                        script: 'git rev-parse --short=12 HEAD',
                        returnStdout: true
                    ).trim()
                }
                echo "Preparing image ${IMAGE_NAME}:${IMAGE_TAG}"
            }
        }

        stage('Install and Verify') {
            steps {
                // verify = prettier check, eslint, typecheck and unit tests. HUSKY=0: no git hooks in CI
                sh '''
                    docker run --rm \\
                      --user "$(id -u):$(id -g)" \\
                      --volumes-from "${JENKINS_CONTAINER_ID:-$HOSTNAME}" \\
                      --workdir "$WORKSPACE" \\
                      --env npm_config_cache=/tmp/.npm \\
                      --env HUSKY=0 \\
                      "$NODE_IMAGE" \\
                      sh -c 'npm ci && npm run verify'
                '''
            }
        }

        stage('API Contract') {
            steps {
                // the committed types against the dev backend's OpenAPI document. Marks the build unstable instead of
                // failing it: a backend change merged first must not block an unrelated web release.
                catchError(buildResult: 'UNSTABLE', stageResult: 'UNSTABLE') {
                    sh '''
                        docker run --rm \\
                          --user "$(id -u):$(id -g)" \\
                          --volumes-from "${JENKINS_CONTAINER_ID:-$HOSTNAME}" \\
                          --workdir "$WORKSPACE" \\
                          "$NODE_IMAGE" \\
                          npm run api:check
                    '''
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    withOptionalSecret('sentry-auth-token', 'SENTRY_AUTH_TOKEN') {
                        // VITE_RELEASE ties Sentry events and source maps to this commit
                        sh '''
                            docker run --rm \\
                              --user "$(id -u):$(id -g)" \\
                              --volumes-from "${JENKINS_CONTAINER_ID:-$HOSTNAME}" \\
                              --workdir "$WORKSPACE" \\
                              --env npm_config_cache=/tmp/.npm \\
                              --env VITE_SENTRY_DSN="$SENTRY_DSN" \\
                              --env VITE_RELEASE="$IMAGE_TAG" \\
                              --env SENTRY_ORG \\
                              --env SENTRY_PROJECT \\
                              --env SENTRY_AUTH_TOKEN \\
                              "$NODE_IMAGE" \\
                              npm run build
                        '''
                    }
                }
                // which build an environment serves, to check after a deploy or a promotion
                sh 'printf \'{"release":"%s"}\\n\' "$IMAGE_TAG" > build/client/version.json'
            }
        }

        stage('Build and Push Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'github-all-repo-pat',
                        usernameVariable: 'REGISTRY_USERNAME',
                        passwordVariable: 'REGISTRY_PASSWORD'
                    )
                ]) {
                    sh '''
                        set +x
                        printf '%s' "$REGISTRY_PASSWORD" | docker login "$IMAGE_REGISTRY" \\
                          --username "$REGISTRY_USERNAME" \\
                          --password-stdin
                        set -x

                        docker build \\
                          --platform "$IMAGE_PLATFORM" \\
                          --tag "$IMAGE_NAME:$IMAGE_TAG" \\
                          .
                        docker push "$IMAGE_NAME:$IMAGE_TAG"
                        docker logout "$IMAGE_REGISTRY" || true
                    '''
                }
            }
        }

        stage('Update GitOps Image Tag') {
            steps {
                dir('gitops') {
                    deleteDir()
                    git branch: "${GITOPS_BRANCH}",
                        credentialsId: 'github-all-repo-pat',
                        url: "${GITOPS_REPOSITORY}",
                        poll: false,
                        changelog: false

                    withCredentials([
                        gitUsernamePassword(
                            credentialsId: 'github-all-repo-pat',
                            gitToolName: 'Default'
                        )
                    ]) {
                        sh '''
                            docker run --rm \\
                              --user "$(id -u):$(id -g)" \\
                              --volumes-from "${JENKINS_CONTAINER_ID:-$HOSTNAME}" \\
                              --workdir "$PWD" \\
                              --env IMAGE_NAME \\
                              --env IMAGE_TAG \\
                              "$YQ_IMAGE" \\
                              -i \\
                              '(.images[] | select(.name == strenv(IMAGE_NAME))).newTag = strenv(IMAGE_TAG) | (.images[] | select(.name == strenv(IMAGE_NAME)) | .newTag) style="double"' \\
                              "$GITOPS_MANIFEST"

                            git diff --check
                            git config user.name 'Jenkins'
                            git config user.email 'jenkins@narrativ.ci'
                            git add "$GITOPS_MANIFEST"

                            if git diff --cached --quiet; then
                                echo "GitOps already points to $IMAGE_TAG; nothing to commit."
                                exit 0
                            fi

                            git commit -m "deploy(narrativ-web-client-dev): $IMAGE_TAG"
                            git push origin "HEAD:$GITOPS_BRANCH"
                        '''
                    }
                }
            }
        }
    }

    post {
        always {
            // Keep only this build's image on the agent. The agent builds with the legacy builder, where an image's
            // layers are the cache that keeps the next build fast, so the latest one stays and every older tag of the
            // same image goes. Skipped when this build made no image, so a failed build never deletes the cache.
            sh '''
                if docker image inspect "$IMAGE_NAME:${IMAGE_TAG:-none}" > /dev/null 2>&1; then
                    docker images "$IMAGE_NAME" --format '{{.Tag}}' \\
                      | grep -vx "$IMAGE_TAG" \\
                      | xargs -r -I{} docker image rm "$IMAGE_NAME:{}" || true
                fi
                docker builder prune --force --filter until=72h || true
            '''
        }
    }
}
