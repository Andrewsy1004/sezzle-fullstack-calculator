// Package handlers wires HTTP requests to the calculator package and shapes
// responses as JSON. It owns all transport concerns (status codes, decoding,
// encoding) so the calculator package can stay transport-agnostic.
package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"calculator-backend/internal/calculator"
	"calculator-backend/internal/models"
)

const maxBodyBytes = 1 << 16 // 64KB — plenty for a calculator payload, guards against abuse.

// HealthHandler reports service liveness. Useful for Docker healthchecks and
// load balancers.
func HealthHandler(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, models.HealthResponse{Status: "ok"})
}

// CalculateHandler handles POST /api/calculate.
func CalculateHandler(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)

	var req models.CalculateRequest
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid JSON body: "+err.Error())
		return
	}

	op := strings.ToLower(strings.TrimSpace(req.Operation))
	if op == "" {
		writeError(w, http.StatusBadRequest, "'operation' is required")
		return
	}

	result, err := calculator.Calculate(calculator.Operation(op), req.A, req.B)
	if err != nil {
		writeError(w, statusForError(err), err.Error())
		return
	}

	writeJSON(w, http.StatusOK, models.CalculateResponse{
		Operation: op,
		Result:    result,
	})
}

// statusForError maps domain errors to HTTP status codes. Everything the
// calculator package can return is a client-input problem (bad operation,
// bad operands) so they're all 400s; anything unrecognized falls back to
// 500 defensively.
func statusForError(err error) int {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero),
		errors.Is(err, calculator.ErrNegativeSqrt),
		errors.Is(err, calculator.ErrUnsupportedOperation),
		errors.Is(err, calculator.ErrMissingOperand),
		errors.Is(err, calculator.ErrNotFinite):
		return http.StatusBadRequest
	default:
		return http.StatusInternalServerError
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, models.ErrorResponse{Error: message})
}
