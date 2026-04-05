export class ReportError extends Error {
    code: string
    publicMessage: string

    constructor(code: string, publicMessage: string) {
        super(publicMessage)
        this.code = code
        this.publicMessage = publicMessage
        Object.setPrototypeOf(this, new.target.prototype)
    }
}
