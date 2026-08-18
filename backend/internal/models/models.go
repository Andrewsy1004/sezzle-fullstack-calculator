// Package models holds the JSON request/response DTOs exposed by the API.
// Keeping them separate from calculator/handlers avoids import cycles and
// makes the wire format easy to find and version.
package models

// CalculateRequest is the JSON body accepted by POST /api/calculate.
//
// B is a pointer so we can distinguish "b was omitted" (nil) from
// "b was explicitly 0" — required for operations like sqrt that only take
// one operand, and for validating that binary operations receive one.
type CalculateRequest struct {
	Operation string   `json:"operation"`
	A         float64  `json:"a"`
	B         *float64 `json:"b,omitempty"`
}

// CalculateResponse is returned on success.
type CalculateResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

// ErrorResponse is returned on any 4xx/5xx.
type ErrorResponse struct {
	Error string `json:"error"`
}

// HealthResponse is returned by GET /health.
type HealthResponse struct {
	Status string `json:"status"`
}
