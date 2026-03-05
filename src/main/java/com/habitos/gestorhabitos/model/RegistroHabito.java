package com.habitos.gestorhabitos.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
public class RegistroHabito {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private LocalDate fecha;

    private boolean completado;

    @ManyToOne
    private Habito habito;

    public RegistroHabito(){}

    public Long getId() { return id; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public boolean isCompletado() { return completado; }
    public void setCompletado(boolean completado) { this.completado = completado; }

    public Habito getHabito() { return habito; }
    public void setHabito(Habito habito) { this.habito = habito; }
}