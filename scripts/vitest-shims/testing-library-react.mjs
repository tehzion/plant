import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const testingLibraryReact = require('../../node_modules/@testing-library/react/dist/@testing-library/react.cjs.js');

export const {
    act,
    cleanup,
    configure,
    fireEvent,
    getConfig,
    render,
    renderHook,
    screen,
    waitFor,
    waitForElementToBeRemoved,
    within,
} = testingLibraryReact;

export default testingLibraryReact;
