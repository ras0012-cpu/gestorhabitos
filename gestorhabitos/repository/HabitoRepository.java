package com.habitos.gestorhabitos.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.habitos.gestorhabitos.model.Habito;

public interface HabitoRepository extends JpaRepository<Habito, Long> {
}