package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"calculator-backend/internal/models"
)

func doCalculate(t *testing.T, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/api/calculate", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	CalculateHandler(rec, req)
	return rec
}

func TestHealthHandler(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()
	HealthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var resp models.HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if resp.Status != "ok" {
		t.Errorf("status = %q, want %q", resp.Status, "ok")
	}
}

func TestCalculateHandler_Success(t *testing.T) {
	tests := []struct {
		name string
		body string
		want float64
	}{
		{"add", `{"operation":"add","a":2,"b":3}`, 5},
		{"subtract", `{"operation":"subtract","a":5,"b":3}`, 2},
		{"multiply", `{"operation":"multiply","a":4,"b":3}`, 12},
		{"divide", `{"operation":"divide","a":10,"b":2}`, 5},
		{"power", `{"operation":"power","a":2,"b":10}`, 1024},
		{"sqrt", `{"operation":"sqrt","a":81}`, 9},
		{"percentage", `{"operation":"percentage","a":50,"b":200}`, 100},
		{"case insensitive op", `{"operation":"ADD","a":1,"b":1}`, 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := doCalculate(t, tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200, body=%s", rec.Code, rec.Body.String())
			}
			var resp models.CalculateResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if resp.Result != tt.want {
				t.Errorf("result = %v, want %v", resp.Result, tt.want)
			}
		})
	}
}

func TestCalculateHandler_Errors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{"division by zero", `{"operation":"divide","a":10,"b":0}`, http.StatusBadRequest},
		{"negative sqrt", `{"operation":"sqrt","a":-4}`, http.StatusBadRequest},
		{"unsupported operation", `{"operation":"modulo","a":1,"b":2}`, http.StatusBadRequest},
		{"missing operand", `{"operation":"add","a":1}`, http.StatusBadRequest},
		{"missing operation", `{"a":1,"b":2}`, http.StatusBadRequest},
		{"malformed json", `{"operation":"add",`, http.StatusBadRequest},
		{"unknown field", `{"operation":"add","a":1,"b":2,"c":3}`, http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := doCalculate(t, tt.body)
			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d, body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			var resp models.ErrorResponse
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decode: %v", err)
			}
			if resp.Error == "" {
				t.Error("expected non-empty error message")
			}
		})
	}
}
