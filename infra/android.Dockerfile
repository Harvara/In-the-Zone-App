FROM eclipse-temurin:21.0.13_9-jdk-jammy@sha256:432e54724c3e57d1846aeb886f4d339f3b0522931c4e64119c2797013b7cfc3c
ARG COMMAND_LINE_TOOLS=13114758
ENV ANDROID_HOME=/opt/android-sdk
ENV ANDROID_SDK_ROOT=/opt/android-sdk
ENV PATH=/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH
RUN apt-get update && apt-get install -y --no-install-recommends curl unzip ca-certificates python3 python3-venv && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /opt/android-sdk/cmdline-tools && curl -fSL --retry 3 "https://dl.google.com/android/repository/commandlinetools-linux-${COMMAND_LINE_TOOLS}_latest.zip" -o /tmp/tools.zip && unzip -q /tmp/tools.zip -d /opt/android-sdk/cmdline-tools && mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest && rm /tmp/tools.zip
RUN yes | sdkmanager --licenses >/dev/null
RUN sdkmanager 'platform-tools' 'platforms;android-36' 'build-tools;35.0.0' 'build-tools;36.0.0'
# Only the Python API is used, so no optional CLI dependencies are installed.
COPY infra/verification-requirements.txt /tmp/verification-requirements.txt
RUN python3 -m venv /opt/apk-verification && /opt/apk-verification/bin/pip install --no-cache-dir --no-deps --require-hashes --only-binary=:all: -r /tmp/verification-requirements.txt
WORKDIR /app/android
