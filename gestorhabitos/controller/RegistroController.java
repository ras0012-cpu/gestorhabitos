package com.habitos.gestorhabitos.controller;

import org.springframework.web.bind.annotation.*;
import com.habitos.gestorhabitos.repository.RegistroRepository;
import com.habitos.gestorhabitos.model.RegistroHabito;

@RestController
@RequestMapping("/registro")
@CrossOrigin(origins = "*")
public class RegistroController {

    private final RegistroRepository registroRepository;

    public RegistroController(RegistroRepository registroRepository){
        this.registroRepository = registroRepository;
    }

    @PostMapping
    public RegistroHabito registrar(@RequestBody RegistroHabito registro){
        return registroRepository.save(registro);
    }
}