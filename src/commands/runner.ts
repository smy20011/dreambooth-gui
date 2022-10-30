export interface Command {
    executable: string;
    arguments: string[];
    environment?: Record<string, string>;
}