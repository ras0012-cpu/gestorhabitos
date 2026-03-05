package com.habitos.gestorhabitos.controller;

import org.springframework.web.bind.annotation.*;
import java.util.List;

import com.habitos.gestorhabitos.model.Habito;
import com.habitos.gestorhabitos.repository.HabitoRepository;

@RestController
@RequestMapping("/habitos")
@CrossOrigin(origins = "*")
public class HabitoController {

    private final HabitoRepository habitoRepository;

    public HabitoController(HabitoRepository habitoRepository){
        this.habitoRepository = habitoRepository;
    }

    @GetMapping
    public List<Habito> obtenerHabitos(){
        return habitoRepository.findAll();
    }

    @PostMapping
    public Habito crearHabito(@RequestBody Habito habito){
        return habitoRepository.save(habito);
    }

    @DeleteMapping("/{id}")
    public void eliminarHabito(@PathVariable Long id){
        habitoRepository.deleteById(id);
    }
}