package com.habitos.gestorhabitos.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.habitos.gestorhabitos.model.Usuario;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    
    Usuario findByEmail(String email);
}