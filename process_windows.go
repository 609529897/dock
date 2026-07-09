//go:build windows

package main

import (
	"os/exec"
	"strconv"
)

func setProcessGroup(cmd *exec.Cmd) {
}

func killProcessTree(pid int) error {
	return exec.Command("taskkill", "/PID", strconv.Itoa(pid), "/T", "/F").Run()
}
