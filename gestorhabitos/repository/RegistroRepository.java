package com.habitos.gestorhabitos.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.habitos.gestorhabitos.model.RegistroHabito;

public interface RegistroRepository extends JpaRepository<RegistroHabito, Long> {
}