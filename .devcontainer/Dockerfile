FROM pulumi/pulumi-nodejs:3.51.1

# Install useful tools
RUN apt-get update && apt-get install -y \
    apt-transport-https \
    build-essential \
    ca-certificates \
    sudo \
    lsb-release \
    dnsutils \
    curl \
    git \
    jq \
    shellcheck

# Configure alias
RUN echo "export PATH=$HOME/.pulumi:$HOME/.pulumi/bin:$PATH" >> ~/.bashrc \
    && echo ". ~/.bash_aliases" >> ~/.bashrc \
    && echo "alias l='ls -aF'" >> ~/.bash_aliases \
    && echo "alias ll='ls -ahlF'" >> ~/.bash_aliases \
    && echo "alias ls='ls --color=auto --group-directories-first'" >> ~/.bash_aliases
