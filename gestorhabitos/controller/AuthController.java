package com.habitos.gestorhabitos.controller;

import org.springframework.web.bind.annotation.*;
import com.habitos.gestorhabitos.repository.UsuarioRepository;
import com.habitos.gestorhabitos.model.Usuario;

@RestController
@RequestMapping("/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final UsuarioRepository usuarioRepository;

    public AuthController(UsuarioRepository usuarioRepository){
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/register")
    public Usuario register(@RequestBody Usuario usuario){
        return usuarioRepository.save(usuario);
    }

    @PostMapping("/login")
    public Usuario login(@RequestBody Usuario usuario){
        Usuario u = usuarioRepository.findByEmail(usuario.getEmail());
        
        if(u != null && u.getPassword().equals(usuario.getPassword())){
            return u;
        }
        
        return null;
    }
}