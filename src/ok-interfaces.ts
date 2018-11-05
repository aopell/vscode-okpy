import * as vscode from 'vscode';

export interface QuickPickTestItem extends vscode.QuickPickItem {
    test: string;
}

export interface OkFile {
    name: string;
    endpoint: string;
    src: string[];
    tests: {[test: string]: TestType};
    protocols: string[];
}

export enum TestType {
    doctest = "doctest",
    ok_test = "ok_test",
    scheme_test = "scheme_test"
}