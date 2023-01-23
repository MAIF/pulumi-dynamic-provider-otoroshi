#!/bin/bash

set -euo pipefail # e(errexit): exit on error, u(nounset): exit on undeclared variables, -o pipefail: pipefail
#set -x            # enable debug

yell() { echo "<2> Error with the command $0: $*" >&2; }
die() { yell "$*"; exit 111; }
try() { "$@" || die "cannot $*"; }


VALID_OPS="DELETE, CREATE"

function usage() {
    echo -e "Usage:0 [-h|--help] [$VALID_OPS]"
    echo ""
}

FOLDER="../conf/performance_test"

function main() {
    case "${1:-}" in
    "DELETE")
        delete
        ;;
    "CREATE")
        create
        ;;
    *)
        echo "Invalid operation"
        usage
        exit 1
        ;;
    esac
}

# Remove performance folder and its content 
function delete() {
    echo "DELETE - folder ${FOLDER}"
    rm -rf "$FOLDER"
}

# Create performance folder and content (organizations, servicedescriptors, apikeys)
function create() {

    echo "CREATE - empty folder ${FOLDER}"
    mkdir -p "$FOLDER"

    echo "CREATE - organizations"
    for i in {1..50}
    do
    cat <<EOF > "${FOLDER}/organization_generated_${i}.yaml"
kind: Organization
spec:
  id: organization_generated_${i}
  name: organization_generated_${i}
  description: organization modified created with Pulumi
  metadata: {}
  tags: []
EOF
    done

    echo "CREATE - servicedescriptors"
    for i in {1..50}
    do
    cat <<EOF > "${FOLDER}/service_generated_${i}.yaml"
kind: ServiceDescriptor
spec:
  id: service_generated_${i}
  name: service_generated_${i}
  description: "service modified"
EOF
done

    echo "CREATE - apikeys"
    for i in {1..100}
    do
    cat <<EOF > "${FOLDER}/apikey_generated_${i}.yaml"
kind: ApiKey
spec:
  clientId: apikey_generated_${i}
  clientName: apikey_generated_${i}
  clientSecret: "$(tr -dc A-Za-z0-9 </dev/urandom | head -c 13 ; echo '')"
EOF
    done
}

if [[ $# -ne 1 ]]; then
    echo "Please provide a correct parameter"
    usage
    exit 1
fi

main "$*"