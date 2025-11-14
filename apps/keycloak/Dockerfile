FROM quay.io/keycloak/keycloak:24.0
USER root
RUN dnf install -y curl && dnf clean all
USER 1000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start-dev"]
