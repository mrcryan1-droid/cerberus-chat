export class CostTracker {
    private _tokenCount = 0;
    addTokens(tokens: number) {
        this._tokenCount += tokens;
    }
    getTokenCount() {
        return this._tokenCount;
    }
    reset() {
        this._tokenCount = 0;
    }
}
