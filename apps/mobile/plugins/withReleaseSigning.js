const { withAppBuildGradle } = require('expo/config-plugins');

const MARKER = '// @sm-release-signing';
const MESSAGE =
  'Release signing is not set up: add SM_UPLOAD_* to ~/.gradle/gradle.properties (see DEPLOY.md).';

// All four must be set, so a half setup fails with the clear message instead of a Gradle error.
const HAS_KEY = [
  'SM_UPLOAD_STORE_FILE',
  'SM_UPLOAD_STORE_PASSWORD',
  'SM_UPLOAD_KEY_ALIAS',
  'SM_UPLOAD_KEY_PASSWORD',
]
  .map((name) => `project.hasProperty('${name}')`)
  .join(' && ');

// Only values come from Gradle properties. No path or password lives in the repo.
const SIGNING_CONFIG = `
        release {
            ${MARKER}
            if (${HAS_KEY}) {
                storeFile file(project.property('SM_UPLOAD_STORE_FILE'))
                storePassword project.property('SM_UPLOAD_STORE_PASSWORD')
                keyAlias project.property('SM_UPLOAD_KEY_ALIAS')
                keyPassword project.property('SM_UPLOAD_KEY_PASSWORD')
            }
        }`;

const RELEASE_SIGNING = `if (${HAS_KEY}) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`;

// The store bundle stops when the upload key is missing. Release APKs keep debug signing.
const SIGNING_CHECK = `
${MARKER}
gradle.taskGraph.whenReady { graph ->
    if (!(${HAS_KEY})) {
        def storeTasks = ['bundleRelease']
        if (graph.allTasks.any { it.project == project && storeTasks.contains(it.name) }) {
            throw new GradleException('${MESSAGE}')
        }
    }
}
`;

function addReleaseSigning(contents) {
  if (contents.includes(MARKER)) {
    return contents;
  }

  const signingStart = contents.indexOf('signingConfigs {');
  const buildTypes = contents.indexOf('buildTypes {');
  const release = contents.indexOf('release {', buildTypes);
  const debugSigning = 'signingConfig signingConfigs.debug';
  const releaseSigning = contents.indexOf(debugSigning, release);

  if (signingStart === -1 || buildTypes === -1 || release === -1 || releaseSigning === -1) {
    throw new Error('withReleaseSigning: android/app/build.gradle has an unexpected layout.');
  }

  const afterSigningStart = signingStart + 'signingConfigs {'.length;

  return (
    contents.slice(0, afterSigningStart) +
    SIGNING_CONFIG +
    contents.slice(afterSigningStart, releaseSigning) +
    RELEASE_SIGNING +
    contents.slice(releaseSigning + debugSigning.length) +
    SIGNING_CHECK
  );
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (c) => {
    c.modResults.contents = addReleaseSigning(c.modResults.contents);

    return c;
  });
}

module.exports = withReleaseSigning;
module.exports.addReleaseSigning = addReleaseSigning;
module.exports.MESSAGE = MESSAGE;
